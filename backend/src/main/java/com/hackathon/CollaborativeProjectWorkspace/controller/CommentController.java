package com.hackathon.CollaborativeProjectWorkspace.controller;

import com.hackathon.CollaborativeProjectWorkspace.dto.CommentResponseDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.CreateCommentRequestDTO;
import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import com.hackathon.CollaborativeProjectWorkspace.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks/{taskId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<CommentResponseDTO> addComment(
            @PathVariable Long taskId,
            @Valid @RequestBody CreateCommentRequestDTO request,
            @AuthenticationPrincipal User currentUser
    ) {
        CommentResponseDTO response = commentService.addComment(taskId, request, currentUser);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<CommentResponseDTO>> getComments(
            @PathVariable Long taskId,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(commentService.getCommentsByTaskId(taskId, currentUser));
    }
}
