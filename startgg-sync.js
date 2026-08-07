const axios = require('axios');

const STARTGG_API = 'https://api.start.gg/gql/alpha';
const SMASH_ULTIMATE_ID = 1386;
const MIN_ENTRANTS = 200;
const MONTHS_AHEAD = 3;

async function fetchStartGGTournaments() {
    const query = `
        query TournamentsByGame($videogameId: ID!, $afterDate: Timestamp!, $beforeDate: Timestamp!) {
            tournaments(query: {
                perPage: 50,
                filter: {
                    videogameIds: [$videogameId],
                    afterDate: $afterDate,
                    beforeDate: $beforeDate
                }
            }) {
                nodes {
                    id
                    name
                    startAt
                    endAt
                    url(relative: false)
                    venueAddress
                    city
                    addrState
                    events(filter: { videogameId: [$videogameId] }) {
                        id
                        numEntrants
                    }
                }
            }
        }
    `;

    const now = new Date();
    const afterDate = Math.floor(now.getTime() / 1000);
    const threeMonthsOut = new Date(now);
    threeMonthsOut.setMonth(threeMonthsOut.getMonth() + MONTHS_AHEAD);
    const beforeDate = Math.floor(threeMonthsOut.getTime() / 1000);

    try {
        const response = await axios.post(STARTGG_API, {
            query,
            variables: { videogameId: SMASH_ULTIMATE_ID, afterDate, beforeDate },
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.STARTGG_API_KEY}`,
            },
        });

        const { data, errors } = response.data;
        if (errors) {
            console.error('start.gg API errors:', errors);
            return [];
        }
        return data?.tournaments?.nodes || [];
    } catch (err) {
        console.error('start.gg request failed:', err.message);
        return [];
    }
}

function maxEntrants(tournament) {
    if (!tournament.events || tournament.events.length === 0) return 0;
    return Math.max(...tournament.events.map(e => e.numEntrants || 0));
}

async function syncStartGGEvents(pool) {
    const tournaments = await fetchStartGGTournaments();
    let successCount = 0;
    let visibleCount = 0;

    for (const t of tournaments) {
        if (!t.startAt) continue;

        try {
            const startDate = new Date(t.startAt * 1000).toISOString();
            const endDate = t.endAt ? new Date(t.endAt * 1000).toISOString() : null;
            const location = [t.venueAddress, t.city, t.addrState].filter(Boolean).join(', ');
            const title = t.name.length > 200 ? t.name.slice(0, 197) + '...' : t.name;
            const isVisible = maxEntrants(t) >= MIN_ENTRANTS;

            await pool.query(
                `INSERT INTO calendar_events (title, start_date, end_date, location, url, startgg_id, source, is_visible)
                 VALUES ($1, $2, $3, $4, $5, $6, 'startgg', $7)
                 ON CONFLICT (startgg_id) DO UPDATE
                 SET title = $1, start_date = $2, end_date = $3, location = $4, url = $5, is_visible = $7`,
                [title, startDate, endDate, location, t.url, t.id, isVisible]
            );
            successCount++;
            if (isVisible) visibleCount++;
        } catch (err) {
            console.error(`Failed to sync tournament ${t.id} (${t.name}):`, err.message);
        }
    }

    console.log(`start.gg sync complete: ${successCount}/${tournaments.length} tournaments tracked, ${visibleCount} currently visible (200+ entrants)`);
}

module.exports = { syncStartGGEvents };