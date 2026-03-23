// src/components/SkeletonCard.jsx

import React from 'react';

const SkeletonCard = () => (
    <div className="skeleton-card">
        <div className="skeleton-image" />
        <div className="skeleton-body">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-title-short" />
            <div className="skeleton-line skeleton-text" />
            <div className="skeleton-line skeleton-text" />
            <div className="skeleton-line skeleton-text-short" />
        </div>
        <div className="skeleton-footer">
            <div className="skeleton-votes">
                <div className="skeleton-btn" />
                <div className="skeleton-line skeleton-count" />
                <div className="skeleton-btn" />
                <div className="skeleton-line skeleton-comments" />
            </div>
            <div className="skeleton-author">
                <div className="skeleton-line skeleton-date" />
                <div className="skeleton-author-row">
                    <div className="skeleton-avatar-small" />
                    <div className="skeleton-line skeleton-username" />
                </div>
            </div>
        </div>
    </div>
);

// Renders a full grid of skeleton cards matching your .forum-grid layout
export const SkeletonGrid = ({ count = 12 }) => (
    <div className="forum-grid">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </div>
);

export default SkeletonCard;