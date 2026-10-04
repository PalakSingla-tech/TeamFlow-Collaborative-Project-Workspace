package com.hackathon.CollaborativeProjectWorkspace.service;

import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import com.hackathon.CollaborativeProjectWorkspace.repository.UserRepository;
import com.hackathon.CollaborativeProjectWorkspace.security.AuthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.hackathon.CollaborativeProjectWorkspace.dto.SignUpRequestDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.SignUpResponseDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.LoginResponseDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.LoginRequestDTO;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthUtil authUtil;

    // Normal USER registration
    public SignUpResponseDTO registerUser(SignUpRequestDTO dto) {
        return register(dto, User.Role.USER);
    }

    // Common registration logic
    private SignUpResponseDTO register(SignUpRequestDTO dto, User.Role role) {

        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        if (!Objects.equals(dto.getPassword(), dto.getConfirmPassword())) {
            throw new RuntimeException("Passwords don't match!");
        }

        User user = new User();

        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setEmail(dto.getEmail());
        user.setRole(role);

        User savedUser = userRepository.save(user);

        return SignUpResponseDTO.builder()
                .userId(savedUser.getUserId())
                .username(savedUser.getUsername())
                .build();
    }

    public LoginResponseDTO loginUser(LoginRequestDTO loginRequestDTO)
    {
        User user = userRepository.findByUsername(loginRequestDTO.getUsername())
                .orElseThrow(() -> new RuntimeException("User doesn't exist"));

        if(!passwordEncoder.matches(loginRequestDTO.getPassword(), user.getPassword()))
        {
            throw new RuntimeException("Invalid username or Password");
        }

        String token = authUtil.generateAccessToken(user);

        return LoginResponseDTO.builder()
                .jwt(token)
                .userId(user.getUserId())
                .build();
    }
}
