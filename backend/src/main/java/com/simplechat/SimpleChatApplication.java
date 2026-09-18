package com.simplechat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication
@EnableMongoRepositories
public class SimpleChatApplication {
    public static void main(String[] args) {
        SpringApplication.run(SimpleChatApplication.class, args);
    }
}
