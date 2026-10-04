package com.hackathon.CollaborativeProjectWorkspace.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @Column(unique = true, nullable = false)
    @NotNull(message = "Username is required")
    private String username;

    @Column(nullable = false)
    @NotNull(message = "Password is required")
    private String password;

    @Email
    @Column(unique = true)
    private String email;

    public enum Role {
        USER,
        ADMIN
    }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    /*
     * Projects owned by this user.
     *
     * User 1 ---- * Projects
     */
    @OneToMany(mappedBy = "owner")
    @Builder.Default
    private List<Projects> ownedProjects = new ArrayList<>();

    /*
     * Project memberships of this user.
     *
     * User 1 ---- * ProjectMembers
     */
    @OneToMany(mappedBy = "user")
    @Builder.Default
    private List<ProjectMembers> projectMemberships = new ArrayList<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(
                new SimpleGrantedAuthority("ROLE_" + role.name())
        );
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }
}
