package com.hackathon.CollaborativeProjectWorkspace.dto;

import lombok.Data;

@Data
public class SignUpRequestDTO {
    private String email;
    private String username;
    private String password;
    private String confirmPassword;
}
