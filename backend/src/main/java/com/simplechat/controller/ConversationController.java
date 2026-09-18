package com.simplechat.controller;

import com.simplechat.dto.ConversationDTO;
import com.simplechat.service.ConversationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @GetMapping
    public ResponseEntity<List<ConversationDTO>> getConversations(@AuthenticationPrincipal UserDetails userDetails) {
        String currentUserId = userDetails.getUsername();
        return ResponseEntity.ok(conversationService.getUserConversations(currentUserId));
    }

    @PostMapping("/{userId}")
    public ResponseEntity<ConversationDTO> getOrCreateConversation(
            @PathVariable("userId") String targetUserId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String currentUserId = userDetails.getUsername();
        ConversationDTO dto = conversationService.getOrCreateConversation(currentUserId, targetUserId);
        return new ResponseEntity<>(dto, HttpStatus.CREATED);
    }

    @DeleteMapping("/{conversationId}")
    public ResponseEntity<Map<String, Object>> deleteConversation(
            @PathVariable("conversationId") String conversationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String currentUserId = userDetails.getUsername();
        conversationService.deleteConversation(conversationId, currentUserId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Conversation deleted successfully");
        return ResponseEntity.ok(response);
    }
}
