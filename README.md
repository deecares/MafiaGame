# Mafia Game

A real-time multiplayer Mafia Party Game built with **React**, **Node.js**, **Socket.IO**, and **TypeScript**.

Players can create or join private rooms, receive secret roles, discuss, vote, and compete in an immersive social deduction experience.

---

## Features

- Create and Join Game Rooms
- Multiplayer Gameplay
- Unique Room Codes
- Secret Role Assignment
- Night & Day Phases
- Real-time Voting System
- Lobby & In-game Chat
- Host Controls
- Responsive UI
- Socket.IO Real-time Communication
- Modern Dark-Themed UI

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Socket.IO Client

### Backend

- Node.js
- Express
- TypeScript
- Socket.IO

---

## Project Structure

```
Mafia/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   └── package.json
│
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/deecares/MafiaGame.git
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

---

## Gameplay

### Create Room

- Create a private lobby
- Share the room code
- Wait for players
- Start the game

### Join Room

- Enter the room code
- Enter a nickname
- Click **Ready**

### Roles

- Civilian
- Mafia
- Doctor
- Detective

---

## Game Flow

```
Lobby
   ↓
Role Assignment
   ↓
Night Phase
   ↓
Day Discussion
   ↓
Voting
   ↓
Elimination
   ↓
Repeat Until Winner
```

---

## Winning Conditions

### Town Wins

All Mafia members are eliminated.

### Mafia Wins

The number of Mafia equals or exceeds the remaining Town players.

---

## Planned Features

- AI Game Master
- Voice Narration
- Spectator Mode
- Player Statistics
- Match History
- Emoji Reactions
- Sound Effects
- Animated UI
- Mobile Optimization
- Authentication
- Global Leaderboards

---

## Screenshots

Screenshots will be added after the UI is completed.

---

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push the branch.
5. Open a Pull Request.

---

## License

This project is licensed under the MIT License.

---

## Author

**Deekshitha Marothu**

GitHub: https://github.com/deecares

---

If you found this project useful, consider starring the repository.
