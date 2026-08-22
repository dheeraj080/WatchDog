package com.url.pathio;

import org.springframework.boot.SpringApplication;

public class TestPathIoApplication {

    public static void main(String[] args) {
        SpringApplication.from(PathIoApplication::main).with(TestcontainersConfiguration.class).run(args);
    }

}
