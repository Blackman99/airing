-- airing leaky demo: a fake pg_dump. No real data.
CREATE TABLE users (id serial primary key, email text, plan text);
INSERT INTO users (email, plan) VALUES ('ada@example.invalid', 'pro');
