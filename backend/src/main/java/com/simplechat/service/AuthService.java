package com.simplechat.service;

import com.simplechat.dto.AuthResponse;
import com.simplechat.dto.LoginRequest;
import com.simplechat.dto.RegisterRequest;
import com.simplechat.dto.UserDTO;
import com.simplechat.exception.BadRequestException;
import com.simplechat.exception.UnauthorizedException;
import com.simplechat.model.User;
import com.simplechat.repository.UserRepository;
import com.simplechat.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    public AuthResponse register(RegisterRequest request) {
        String cleanUsername = request.getUsername().trim().toLowerCase();
        String cleanEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsernameIgnoreCase(cleanUsername)) {
            throw new BadRequestException("Username is already taken");
        }
        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new BadRequestException("Email is already registered");
        }

        User user = new User(
                request.getName().trim(),
                cleanUsername,
                cleanEmail,
                passwordEncoder.encode(request.getPassword()),
                request.getProfileImage() != null ? request.getProfileImage().trim() : null
        );
        user.setOnline(true);
        user.setLastSeen(Instant.now());

        User savedUser = userRepository.save(user);
        String token = tokenProvider.generateToken(savedUser.getId());

        return new AuthResponse(token, new UserDTO(savedUser));
    }

    public AuthResponse login(LoginRequest request) {
        String term = request.getUsernameOrEmail().trim().toLowerCase();

        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(term, term)
                .orElseThrow(() -> new UnauthorizedException("Invalid username/email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid username/email or password");
        }

        user.setOnline(true);
        user.setLastSeen(Instant.now());
        userRepository.save(user);

        String token = tokenProvider.generateToken(user.getId());
        return new AuthResponse(token, new UserDTO(user));
    }
}
