package com.example.demo.controller;

import com.example.demo.config.ProjectAuthorization;
import com.example.demo.controller.dto.*;
import com.example.demo.model.Post;
import com.example.demo.model.ProjectRole;
import com.example.demo.model.Role;
import com.example.demo.repository.PostRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/projects/{projectId}")
public class PostController {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectAuthorization authorization;

    public PostController(PostRepository postRepository,
                          UserRepository userRepository,
                          ProjectRepository projectRepository,
                          ProjectAuthorization authorization) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.authorization = authorization;
    }

    @PostMapping("/post")
    public ResponseEntity<Void> createPost(@PathVariable UUID projectId,
                                           @RequestBody CreatePostDto dto,
                                           JwtAuthenticationToken token) {
        var userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var user    = userRepository.findById(userId).orElseThrow();
        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        var post = new Post();
        post.setUser(user);
        post.setProject(project);
        post.setContent(dto.content());
        postRepository.save(post);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/feed")
    public ResponseEntity<FeedDto> feed(@PathVariable UUID projectId,
                                        @RequestParam(value = "page", defaultValue = "0") int page,
                                        @RequestParam(value = "pageSize", defaultValue = "10") int pageSize,
                                        JwtAuthenticationToken token) {
        var userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var posts = postRepository.findAllByProject_ProjectId(
                        projectId,
                        PageRequest.of(page, pageSize, Sort.Direction.DESC, "creationTimestamp"))
                .map(post -> new FeedItemDto(
                        post.getPostId(),
                        post.getContent(),
                        post.getUser().getUsername(),
                        post.getProject().getProjectId(),
                        post.getProject().getNome(),
                        post.getCreationTimestamp(),
                        post.getComments().stream()
                                .map(c -> new CommentDto(
                                        c.getCommentId(), c.getContent(),
                                        c.getUser().getUsername(), c.getCreationTimestamp()))
                                .toList()));

        return ResponseEntity.ok(new FeedDto(
                posts.getContent(), page, pageSize, posts.getTotalPages(), posts.getTotalElements()));
    }

    @DeleteMapping("/post/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable UUID projectId,
                                           @PathVariable Long postId,
                                           JwtAuthenticationToken token) {
        var userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var user = userRepository.findById(userId).orElseThrow();
        var post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!post.getProject().getProjectId().equals(projectId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        var isAdmin   = user.getRoles().stream().anyMatch(r -> r.getName().equalsIgnoreCase(Role.Values.ADMIN.name()));
        var isManager = authorization.getMembership(projectId, userId).getRole().ordinal() <= ProjectRole.MANAGER.ordinal();
        var isAuthor  = post.getUser().getUserId().equals(userId);

        if (isAdmin || isManager || isAuthor) {
            postRepository.deleteById(postId);
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }
}
