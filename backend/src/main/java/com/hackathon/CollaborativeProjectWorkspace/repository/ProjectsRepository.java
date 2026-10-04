package com.hackathon.CollaborativeProjectWorkspace.repository;

import com.hackathon.CollaborativeProjectWorkspace.entity.Projects;
import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectsRepository extends JpaRepository<Projects, Long> {
    List<Projects> findByOwner(User owner);

    Optional<Projects> findByProjectId(Long projectId);

    @Query("SELECT DISTINCT pm.project FROM ProjectMembers pm " +
           "LEFT JOIN FETCH pm.project.owner " +
           "WHERE pm.user.userId = :userId")
    List<Projects> findAllAccessibleProjectsByUserId(@Param("userId") Long userId);
}
