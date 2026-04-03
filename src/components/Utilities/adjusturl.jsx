export const getImageUrl = (characterName, selectedSkin, usage) => {
    const prefix = usage === 'header' ? 'chara_0_' : 'chara_3_';
    return `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${characterName}/${prefix}${characterName.toLowerCase()}_0${selectedSkin}.png`;
};