export const getImageUrl = (characterName, selectedSkin, usage) => {
    const prefix = usage === 'header' ? 'chara_0_' : 'chara_3_';
    return `/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${characterName}/${prefix}${characterName}_0${selectedSkin}.png`;
};