package com.example.demo.config;

import com.example.demo.model.Project;
import com.example.demo.model.ProjectMember;
import com.example.demo.model.ProjectRole;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.repository.ProjectMemberRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Popula o banco com usuarios e projetos de exemplo, para permitir demonstrar
 * a busca/filtragem de projetos (ProjectsPage.jsx) sem precisar cadastrar
 * dados manualmente. Segue o mesmo padrao do AdminUserConfig: roda apos o
 * schema ser criado (ddl-auto=create) e e idempotente (nao duplica dados se
 * ja existirem projetos).
 */
@Configuration
public class SampleProjectDataConfig implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public SampleProjectDataConfig(UserRepository userRepository,
                                    RoleRepository roleRepository,
                                    ProjectRepository projectRepository,
                                    ProjectMemberRepository projectMemberRepository,
                                    BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private record SeedProject(String ownerUsername, String nome, String descricao) {
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (projectRepository.count() > 0) {
            System.out.println("Projetos de exemplo ja existem, seed ignorado.");
            return;
        }

        var roleBasic = roleRepository.findByName(Role.Values.BASIC.name());

        var seedProjects = List.of(
                new SeedProject("ana.silva", "App de Delivery Sabor Local",
                        "Aplicativo mobile para pedidos de comida em restaurantes locais, com rastreamento de entrega em tempo real."),
                new SeedProject("ana.silva", "FitTrack - App de Treinos",
                        "Aplicativo para acompanhamento de treinos, dieta e evolucao fisica com graficos de progresso."),
                new SeedProject("bruno.costa", "Sistema de Gestao Escolar",
                        "Plataforma web para gerenciar matriculas, notas e frequencia de alunos, feita em Spring Boot e React."),
                new SeedProject("bruno.costa", "Dashboard de Analytics Financeiro",
                        "Painel interativo com graficos e metricas de investimentos, integrado a APIs de bolsa de valores."),
                new SeedProject("carla.souza", "E-commerce ModaVerde",
                        "Loja virtual de roupas sustentaveis com carrinho de compras, pagamento integrado e painel administrativo."),
                new SeedProject("carla.souza", "EduPlay - Cursos Online",
                        "Plataforma de ensino a distancia com video-aulas, quizzes e certificados automaticos."),
                new SeedProject("diego.santos", "API de Pagamentos PixFacil",
                        "Servico backend para processar pagamentos via Pix, com webhooks e relatorios financeiros."),
                new SeedProject("diego.santos", "ChatFlow - Mensagens em Tempo Real",
                        "Plataforma de chat corporativo com salas por equipe, notificacoes instantaneas e historico de mensagens."),
                new SeedProject("elisa.melo", "DevConnect - Rede Social para Devs",
                        "Rede social voltada para desenvolvedores compartilharem projetos, artigos e vagas de emprego."),
                new SeedProject("elisa.melo", "FreelaHub - Marketplace de Freelancers",
                        "Marketplace conectando freelancers e clientes, com sistema de propostas, contratos e avaliacoes.")
        );

        var ownerUsernames = seedProjects.stream()
                .map(SeedProject::ownerUsername)
                .distinct()
                .toList();

        for (String username : ownerUsernames) {
            if (userRepository.findByUsername(username).isEmpty()) {
                var user = new User();
                user.setUsername(username);
                user.setPassword(passwordEncoder.encode("123"));
                user.setRoles(Set.of(roleBasic));
                userRepository.save(user);
            }
        }

        for (SeedProject seed : seedProjects) {
            var owner = userRepository.findByUsername(seed.ownerUsername()).orElseThrow();

            var project = new Project();
            project.setNome(seed.nome());
            project.setDescricao(seed.descricao());
            project.setOwner(owner);
            projectRepository.save(project);

            var membership = new ProjectMember();
            membership.setProject(project);
            membership.setUser(owner);
            membership.setRole(ProjectRole.OWNER);
            projectMemberRepository.save(membership);
        }

        System.out.println("Projetos de exemplo criados: " + seedProjects.size());
    }
}
