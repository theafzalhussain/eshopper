import React, { useState } from 'react';

export default function DashboardTodo({ todos: initialTodos = [] }) {
  const [todos, setTodos] = useState(initialTodos);
  const [input, setInput] = useState('');

  const addTodo = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input, done: false }]);
    setInput('');
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo));
  };

  const removeTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="glass p-6 rounded-xl shadow-gold mt-8">
      <h2 className="text-lg font-serif gold-accent mb-4">Admin To-Do List</h2>
      <form onSubmit={addTodo} className="flex gap-2 mb-4">
        <input
          className="flex-1 p-2 rounded bg-slate/30 border border-slate-700 text-white focus:outline-gold"
          placeholder="Add new task..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" className="bg-gold gold-accent px-4 py-2 rounded font-bold">Add</button>
      </form>
      <ul className="divide-y divide-slate/40">
        {todos.length === 0 && <li className="py-2 text-slate-400">No tasks</li>}
        {todos.map(todo => (
          <li key={todo.id} className="py-2 flex items-center gap-3">
            <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
            <span className={todo.done ? 'line-through text-slate-400' : ''}>{todo.text}</span>
            <button onClick={() => removeTodo(todo.id)} className="ml-auto text-xs text-red-400 hover:underline">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
