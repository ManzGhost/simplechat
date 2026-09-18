package com.simplechat.controller;

import com.simplechat.dto.MessageDTO;
import com.simplechat.dto.SendMessageRequest;
import com.simplechat.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    // REST Endpoint: GET /api/messages/{conversationId}
    @GetMapping("/api/messages/{conversationId}")
    public ResponseEntity<List<MessageDTO>> getMessages(
            @PathVariable("conversationId") String conversationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String currentUserId = userDetails.getUsername();
        return ResponseEntity.ok(messageService.getMessages(conversationId, currentUserId));
    }

    // REST Endpoint: PUT /api/messages/{conversationId}/seen
    @PutMapping("/api/messages/{conversationId}/seen")
    public ResponseEntity<Map<String, Object>> markAsSeen(
            @PathVariable("conversationId") String conversationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String currentUserId = userDetails.getUsername();
        int seenCount = messageService.markAsSeen(conversationId, currentUserId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("seenCount", seenCount);
        return ResponseEntity.ok(response);
    }

    // STOMP WebSocket Message Mapping: /app/chat.send
    @MessageMapping("/chat.send")
    public void handleSendChatMessage(@Payload @Valid SendMessageRequest request, Principal principal) {
        String senderId = (principal != null) ? principal.getName() : request.getSenderId();
        messageService.sendMessage(request, senderId);
    }

    // STOMP WebSocket Message Mapping: /app/chat.seen
    @MessageMapping("/chat.seen")
    public void handleSeenChatMessage(@Payload Map<String, String> payload, Principal principal) {
        String conversationId = payload.get("conversationId");
        String currentUserId = (principal != null) ? principal.getName() : payload.get("userId");
        if (conversationId != null && currentUserId != null) {
            messageService.markAsSeen(conversationId, currentUserId);
        }
    }
}
