package com.simplechat.service;

import com.simplechat.dto.UpdateProfileRequest;
import com.simplechat.dto.UserDTO;
import com.simplechat.exception.ResourceNotFoundException;
import com.simplechat.model.User;
import com.simplechat.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public UserService(UserRepository userRepository, SimpMessagingTemplate messagingTemplate) {
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public UserDTO getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return new UserDTO(user);
    }

    public UserDTO updateProfile(String userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
        }
        if (request.getProfileImage() != null) {
            user.setProfileImage(request.getProfileImage().trim().isEmpty() ? null : request.getProfileImage().trim());
        }

        User updated = userRepository.save(user);
        return new UserDTO(updated);
    }

    public List<UserDTO> searchUsers(String query, String currentUserId) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        return userRepository.searchUsers(query.trim(), currentUserId).stream()
                .map(UserDTO::new)
                .collect(Collectors.toList());
    }

    public void updatePresence(String userId, boolean online) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setOnline(online);
            user.setLastSeen(Instant.now());
            userRepository.save(user);

            Map<String, Object> presenceEvent = new HashMap<>();
            presenceEvent.put("type", "USER_PRESENCE");
            presenceEvent.put("userId", userId);
            presenceEvent.put("online", online);
            presenceEvent.put("lastSeen", user.getLastSeen());

            messagingTemplate.convertAndSend("/topic/presence", presenceEvent);
        });
    }
}
