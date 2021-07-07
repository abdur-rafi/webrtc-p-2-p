import {io} from 'socket.io-client'
import { useEffect, useState } from 'react';
import {iceServers} from '../credentials'

let signalingChannel = io('https://webrtc-ptest.herokuapp.com' , {
  transports : ['websocket'],
});

// const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}

const configuration = iceServers;

async function makeCall( user ) {
  const peerConnection = new RTCPeerConnection(configuration);
  const dataChannel = peerConnection.createDataChannel('testChannel');
  dataChannel.addEventListener('open',e =>{
    console.log(e);
    dataChannel.send({
      'message' : 'hello from the other side'
    })
  })
  signalingChannel.off('answer');
  signalingChannel.on('answer', async message => {
      if (message.answer) {
        console.log(message.answer)
          const remoteDesc = new RTCSessionDescription(message.answer);
          await peerConnection.setRemoteDescription(remoteDesc);
      }
  });
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  signalingChannel.emit('offer',{'offer': offer, user : user});
  peerConnection.addEventListener('icecandidate', event => {
    console.log(event);
    if (event.candidate) {
        signalingChannel.emit('icecandidate',{'icecandidate': event.candidate, to : user});
    }
  });
  signalingChannel.on('icecandidate', async message => {
    if (message.icecandidate) {
        console.log('iceFromServer', message.icecandidate);
        try {
            await peerConnection.addIceCandidate(message.icecandidate);
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    }
  });
  peerConnection.addEventListener('connectionstatechange', event => {
    console.log(event);
    if (peerConnection.connectionState === 'connected') {
        console.log('connected')
    }
  })
}

async function answerCall(offer, from){
  const peerConnection = new RTCPeerConnection(configuration);
  peerConnection.addEventListener('datachannel', event => {
      const dataChannel = event.channel;
      dataChannel.addEventListener('message', m=>{
        console.log(m);
      })

  });
  peerConnection.addEventListener('icecandidate', event => {
    // console.log(event);
    if (event.candidate) {
        signalingChannel.emit('icecandidate',{'icecandidate': event.candidate, from : from});
    }
  });
  signalingChannel.on('icecandidate', async message => {
    console.log('iceFromServer', message);
    if (message.icecandidate) {
        try {
            await peerConnection.addIceCandidate(message.icecandidate);
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    }
  });
  peerConnection.addEventListener('connectionstatechange', event => {
    console.log(event);
    if (peerConnection.connectionState === 'connected') {
        console.log('connected')
    }
  })
  // signalingChannel.off('offfer');
  // signalingChannel.on('offer', async message => {
  // if (message.offer) {
    // console.log("herre")
  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  // from = message.from;
  // console.log('from', from);
  signalingChannel.emit('answer',{answer: answer, from : from});
  // }
  // });
  
}



// Listen for remote ICE candidates and add them to the local RTCPeerConnection




function App() {

  const [users, setUsers] = useState([])
  const [s , setS] = useState('');
  useEffect(()=>{
    signalingChannel.on('users', (data)=>{
      setUsers(data.users);
    })
    signalingChannel.on('self', (data)=>{
      setS(data.self);
    })
    signalingChannel.on('offer', (data)=>{
      answerCall(data.offer, data.from);
    })
  }, [])
  return (
    <div className="App">
      <header className="App-header">
        <div>
          {users.map(u=><button onClick = {()=>makeCall(u)}>{u}</button>)}
        </div>
        <div>
          self : {s}
        </div>
        
      </header>
    </div>
  );
}

export default App;
