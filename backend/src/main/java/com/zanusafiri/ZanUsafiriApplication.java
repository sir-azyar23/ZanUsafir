package com.zanusafiri;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ZanUsafiriApplication {
    public static void main(String[] args) {
        SpringApplication.run(ZanUsafiriApplication.class, args);
    }
}
