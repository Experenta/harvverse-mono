"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@harvverse-monorepo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@harvverse-monorepo/ui/components/card";
import { Input } from "@harvverse-monorepo/ui/components/input";

import { queryClient, trpc } from "@/utils/trpc";

export default function Home() {
	const [title, setTitle] = useState("");
	const todosQuery = useQuery(trpc.todos.list.queryOptions());

	const invalidateTodos = () =>
		queryClient.invalidateQueries({
			queryKey: trpc.todos.list.queryKey(),
		});

	const createTodo = useMutation(
		trpc.todos.create.mutationOptions({
			onSuccess: () => {
				setTitle("");
				return invalidateTodos();
			},
		}),
	);

	const toggleTodo = useMutation(
		trpc.todos.toggle.mutationOptions({
			onSuccess: invalidateTodos,
		}),
	);

	const deleteTodo = useMutation(
		trpc.todos.delete.mutationOptions({
			onSuccess: invalidateTodos,
		}),
	);

	const todos = todosQuery.data ?? [];
	const openCount = useMemo(
		() => todos.filter((todo) => !todo.completed).length,
		[todos],
	);
	const isMutating =
		createTodo.isPending || toggleTodo.isPending || deleteTodo.isPending;

	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			return;
		}

		createTodo.mutate({ title: trimmedTitle });
	}

	return (
		<main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col justify-center px-4 py-10">
			<section className="grid gap-6">
				<div className="space-y-2">
					<p className="text-xs font-medium uppercase text-muted-foreground">
						Fullstack demo
					</p>
					<h1 className="text-3xl font-semibold tracking-normal">Todos</h1>
					<p className="max-w-xl text-sm text-muted-foreground">
						A small tRPC and Drizzle workflow backed by the local Postgres service.
					</p>
				</div>

				<Card>
					<CardHeader className="gap-1">
						<div className="flex items-start justify-between gap-4">
							<div>
								<CardTitle>Task list</CardTitle>
								<CardDescription>
									{todosQuery.isLoading
										? "Loading tasks"
										: `${openCount} open, ${todos.length} total`}
								</CardDescription>
							</div>
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<span
									className={`size-2 rounded-full ${
										todosQuery.isError ? "bg-destructive" : "bg-emerald-500"
									}`}
								/>
								{todosQuery.isError ? "API error" : "API online"}
							</div>
						</div>
					</CardHeader>
					<CardContent className="grid gap-4">
						<form className="flex gap-2" onSubmit={onSubmit}>
							<Input
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="Add a todo"
								disabled={createTodo.isPending}
								aria-label="Todo title"
							/>
							<Button type="submit" disabled={!title.trim() || createTodo.isPending}>
								{createTodo.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
								Add
							</Button>
						</form>

						<div className="divide-y border">
							{todosQuery.isLoading ? (
								<div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
									<Loader2 className="size-4 animate-spin" />
									Loading todos
								</div>
							) : todos.length > 0 ? (
								todos.map((todo) => (
									<div
										key={todo.id}
										className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3"
									>
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											aria-label={
												todo.completed
													? `Mark ${todo.title} incomplete`
													: `Mark ${todo.title} complete`
											}
											disabled={isMutating}
											onClick={() =>
												toggleTodo.mutate({
													id: todo.id,
													completed: !todo.completed,
												})
											}
										>
											{todo.completed ? (
												<CheckCircle2 className="text-emerald-600" />
											) : (
												<Circle />
											)}
										</Button>
										<span
											className={`min-w-0 truncate text-sm ${
												todo.completed
													? "text-muted-foreground line-through"
													: "text-foreground"
											}`}
										>
											{todo.title}
										</span>
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											aria-label={`Delete ${todo.title}`}
											disabled={isMutating}
											onClick={() => deleteTodo.mutate({ id: todo.id })}
										>
											<Trash2 />
										</Button>
									</div>
								))
							) : (
								<div className="px-3 py-4 text-sm text-muted-foreground">
									No todos yet.
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</section>
		</main>
	);
}
