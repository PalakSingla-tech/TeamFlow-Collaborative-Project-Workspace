package com.hackathon.CollaborativeProjectWorkspace.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateCommentRequestDTO {
    @NotBlank(message = "Comment body is required")
    private String body;
}
