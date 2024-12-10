from flask import Flask, render_template
from flask_socketio import SocketIO

from flask_socketio import join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('index.html')



@socketio.on('join-room')
def join_room_handler(data):
    room = data['room']
    join_room(room)
    emit('user-joined', f"User joined room {room}", room=room)

@socketio.on('leave-room')
def leave_room_handler(data):
    room = data['room']
    leave_room(room)
    emit('user-left', f"User left room {room}", room=room)


# WebRTC signaling routes
@socketio.on('offer')
def handle_offer(data):
    socketio.emit('offer', data, broadcast=True)

@socketio.on('answer')
def handle_answer(data):
    socketio.emit('answer', data, broadcast=True)

@socketio.on('ice-candidate')
def handle_ice_candidate(data):
    socketio.emit('ice-candidate', data, broadcast=True)


@socketio.on('chat-message')
def handle_chat_message(message):
    socketio.emit('chat-message', message, broadcast=True)


if __name__ == '__main__':
    socketio.run(app, debug=True)
