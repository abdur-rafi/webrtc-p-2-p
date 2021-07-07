import express from 'express';
import { createServer } from 'http';
import { Socket, Server } from 'socket.io';



const app = express();
const sockets = []

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors : {
        origin : 'https://webrtc-test-client.netlify.app',
        methods : ['GET', 'POST']
    },
    transports : ['websocket']
})

io.on('connection', socket=>{
    console.log(socket.id);
    sockets.push(socket.id);
    io.to(socket.id).emit('self', {
        self : socket.id
    })
    io.emit('users', {
        users : sockets
    })
    console.log(sockets);
    
    socket.on('disconnect', ()=>{
        sockets.splice(sockets.indexOf(socket.id));
        console.log('disconnected');
        io.emit('users', {
            users : sockets
        })
    })
    socket.on('offer', data=>{
        // let i = sockets.indexOf(socket.id);
        // if(sockets.length < 2) return;
        // i -= 1;
        // if(i < 0) i = sockets.length - 1;
        console.log(data);
        io.to(data.user).emit('offer', {
            offer : data.offer,
            from : socket.id
        })
    })

    socket.on('answer',data=>{
        console.log("answer", data);
        io.to(data.from).emit('answer', {
            answer : data.answer
        })
    } )

    socket.on('icecandidate', data=>{
        console.log(data);
        socket.broadcast.emit('icecandidate', {
            icecandidate : data.icecandidate
        })
    })
})

app.get('/', (req, res)=>{
    res.send('set up done');
})

httpServer.listen(process.env.PORT || '3001', () => {
    console.log('The application is listening ');
})