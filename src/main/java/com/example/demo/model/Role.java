package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "tb_roles")
public class Role {

    @Id
    @GeneratedValue(strategy =  GenerationType.IDENTITY)
    @Column(name = "role_id")
    private long id_roleId;

    private String name;

    public long getId_roleId() {
        return id_roleId;
    }

    public void setId_roleId(long id_roleId) {
        this.id_roleId = id_roleId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public enum Values {

        ADMIN(1L),
        BASIC(2L);
        long roleId;
        Values(long roleId){
            this.roleId = roleId;
        }

        public long getRoleId() {
            return roleId;
        }
    }
}
