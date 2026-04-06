import { useState, useRef } from "react";
import { API } from '../Utilities/apiUrl';

const TextMentionArea = ({
  value,
  onChange,
  mentions = [],          // Pass current mentions from parent
  setMentions,            // Callback to update parent mentions
  placeholder = "Write something...",
  rows = 4,
  maxLength = null,
}) => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const textareaRef = useRef(null);

  // 🔍 Fetch users from backend
  const fetchUsers = async (query) => {
    try {
      const res = await fetch(
        `${API}/forumusers/get-user/${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setAvailableUsers(data);
    } catch (err) {
      console.error("Mention fetch error:", err);
      setAvailableUsers([]);
    }
  };

  // 🧠 Handle typing
  const handleChange = (e) => {
    const text = e.target.value;
    onChange(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);

    // Match last "@word" before cursor
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (match) {
      const query = match[1];
      setMentionQuery(query);
      setMentionStart(cursorPos - query.length - 1);

      if (query.length > 0) {
        fetchUsers(query);
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    } else {
      setShowDropdown(false);
    }
  };

  // 🎯 Select a user from dropdown
  const handleSelect = (username) => {
    if (typeof value !== "string" || mentionStart === null) return;

    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + mentionQuery.length + 1);
    const newText = `${before}@${username} ${after}`;
    onChange(newText);

    // Update mentions in parent
    if (setMentions) {
      setMentions((prev) => [
        ...prev,
        { username, position: mentionStart, length: username.length + 1 },
      ]);
    }

    setShowDropdown(false);
    setMentionQuery("");
    setActiveIndex(-1);

    // Restore cursor after inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
          mentionStart + username.length + 2; // +1 for @, +1 for space
      }
    }, 0);
  };

  // ⌨ Keyboard navigation in dropdown
  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, availableUsers.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(availableUsers[activeIndex].name);
    }
    if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div style={{ position: "relative", overflow: "visible" }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        className="form-control"
      />

      {maxLength && (
        <div className="text-muted text-end small mt-1">
          {value.length}/{maxLength}
        </div>
      )}
      
      {showDropdown && (
        <div className="mention-dropdown">
          {availableUsers.length > 0 ? (
            availableUsers.map((user, index) => {
              const skin =
                user.selected_skin !== undefined
                  ? String(user.selected_skin).padStart(2, "0")
                  : null;
              const imageUrl =
                user.character_name && skin
                    ? `${process.env.REACT_APP_CDN_URL}/pfp_images/Super Smash Bros Ultimate/Fighter Portraits/${user.character_name}/chara_0_${user.character_name.toLowerCase()}_${skin}.png`
                    : `${process.env.REACT_APP_CDN_URL}/pfp_images/default.png`;

              return (
                <div
                  key={user.users_id}
                  className={`mention-item ${index === activeIndex ? "active" : ""}`}
                  onClick={() => handleSelect(user.name)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="d-flex align-items-center">
                    <img
                      src={imageUrl}
                      alt={user.name}
                      width="32"
                      height="32"
                      className="rounded-circle me-2"
                      onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `${process.env.REACT_APP_CDN_URL}/pfp_images/default.png`;
                      }}
                    />
                    <div className="ms-4" style={{ lineHeight: 1.2 }}>
                      <div className="fw-semibold">{user.name}</div>
                      <div className="text-muted small">{user.role || "Member"}</div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="mention-item text-muted">No users found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TextMentionArea;