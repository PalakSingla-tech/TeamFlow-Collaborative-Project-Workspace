package com.hackathon.CollaborativeProjectWorkspace.controller;

import com.hackathon.CollaborativeProjectWorkspace.dto.LoginRequestDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.LoginResponseDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.SignUpRequestDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.SignUpResponseDTO;
import com.hackathon.CollaborativeProjectWorkspace.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<SignUpResponseDTO> registerUser(@RequestBody SignUpRequestDTO signUpRequestDTO)
    {
        return ResponseEntity.ok(authService.registerUser(signUpRequestDTO));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> loginUser(@RequestBody LoginRequestDTO loginRequestDTO)
    {
        return ResponseEntity.ok(authService.loginUser(loginRequestDTO));
    }
}
