package com.simplechat.controller;

import com.simplechat.model.FriendRequest;
import com.simplechat.model.Friendship;
import com.simplechat.model.User;
import com.simplechat.repository.FriendRequestRepository;
import com.simplechat.repository.FriendshipRepository;
import com.simplechat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/friends")
@CrossOrigin(origins = "*")
public class FriendController {

    private final FriendRequestRepository friendRequestRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    public FriendController(FriendRequestRepository friendRequestRepository,
                            FriendshipRepository friendshipRepository,
                            UserRepository userRepository) {
        this.friendRequestRepository = friendRequestRepository;
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<User>> getFriends(@PathVariable String userId) {
        List<Friendship> list = friendshipRepository.findByUser1IdOrUser2Id(userId, userId);
        List<User> friends = new ArrayList<>();
        for (Friendship f : list) {
            String friendId = f.getUser1Id().equals(userId) ? f.getUser2Id() : f.getUser1Id();
            userRepository.findById(friendId).ifPresent(u -> {
                u.setPassword(null);
                friends.add(u);
            });
        }
        return ResponseEntity.ok(friends);
    }

    @GetMapping("/requests/{userId}")
    public ResponseEntity<List<FriendRequest>> getPendingRequests(@PathVariable String userId) {
        return ResponseEntity.ok(friendRequestRepository.findByReceiverIdAndStatus(userId, "PENDING"));
    }

    @PostMapping("/request")
    public ResponseEntity<FriendRequest> sendRequest(@RequestBody Map<String, String> body) {
        String senderId = body.get("senderId");
        String receiverId = body.get("receiverId");

        if (senderId == null || receiverId == null || senderId.equals(receiverId)) {
            return ResponseEntity.badRequest().build();
        }

        Optional<FriendRequest> existing = friendRequestRepository.findBySenderIdAndReceiverId(senderId, receiverId);
        if (existing.isPresent()) {
            return ResponseEntity.ok(existing.get());
        }

        FriendRequest request = new FriendRequest(senderId, receiverId);
        FriendRequest saved = friendRequestRepository.save(request);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/accept/{requestId}")
    public ResponseEntity<?> acceptRequest(@PathVariable String requestId) {
        Optional<FriendRequest> opt = friendRequestRepository.findById(requestId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        FriendRequest req = opt.get();
        req.setStatus("ACCEPTED");
        req.setUpdatedAt(Instant.now());
        friendRequestRepository.save(req);

        Friendship friendship = new Friendship(req.getSenderId(), req.getReceiverId());
        friendshipRepository.save(friendship);

        return ResponseEntity.ok(Map.of("message", "Friend request accepted", "friendship", friendship));
    }
}
