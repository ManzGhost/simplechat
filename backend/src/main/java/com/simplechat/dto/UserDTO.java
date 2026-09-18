package com.simplechat.dto;

import com.simplechat.model.User;
import java.time.Instant;

public class UserDTO {
    private String id;
    private String name;
    private String username;
    private String email;
    private String profileImage;
    private boolean online;
    private Instant lastSeen;
    private Instant createdAt;

    public UserDTO() {}

    public UserDTO(User user) {
        if (user != null) {
            this.id = user.getId();
            this.name = user.getName();
            this.username = user.getUsername();
            this.email = user.getEmail();
            this.profileImage = user.getProfileImage();
            this.online = user.isOnline();
            this.lastSeen = user.getLastSeen();
            this.createdAt = user.getCreatedAt();
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }

    public boolean isOnline() { return online; }
    public void setOnline(boolean online) { this.online = online; }

    public Instant getLastSeen() { return lastSeen; }
    public void setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
