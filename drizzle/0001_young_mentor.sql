CREATE TABLE `partner_access_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`firm` varchar(300),
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`state` varchar(100),
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_access_requests_id` PRIMARY KEY(`id`)
);
