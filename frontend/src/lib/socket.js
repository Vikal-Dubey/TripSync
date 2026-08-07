import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

let socket = null;

export function getSocket(token) {
  if (!socket) {
    socket = io(API_URL, { auth: { token }, autoConnect: false });
  } else{
    socket.auth.token=token;
  }
  return socket;
}