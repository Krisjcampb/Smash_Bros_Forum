import React, { useState, useEffect } from 'react';

const RotatingBanner = ({ banners }) => {
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
        }, 3000); // Rotate every 3 seconds
        return () => clearInterval(interval);
    }, [banners.length]);

    return (
        <div className="rotating-banner">
            <p>{banners[currentBannerIndex]}</p>
        </div>
    );
};

export default RotatingBanner;