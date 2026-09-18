ALTER TABLE `messages` ADD `readAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `pushToken` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `typingUntil` timestamp;