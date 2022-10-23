import { Response, Request } from 'express';
import path = require('path');
const PORT = 3000;
import express = require('express')
import { Socket } from 'socket.io';
const app = require('express')();
const server = require('http').Server(app)
const io = require('socket.io')(server);

app.use( express.urlencoded({ extended: false }) );
app.set( 'views', path.join( __dirname, '/views') );
app.set( 'view engine', 'jade' );
app.use( express.static( __dirname + '//static' ) )


app.get("/", ( req:Request, res:Response ) => {
    res.render( "index" )
})

server.listen( PORT, () => {
    console.log(`Server running at http://127.0.0.1:${PORT}` );
})

function SendMsg( socket:Socket, event:string, msg ) {
    socket.emit( event, msg )
    socket.broadcast.emit( event, msg )
} // SendMsg()

function GetRandom(x:number) {
    return Math.floor(Math.random()*x);
} // GetRandom()

function PickQuestion( x:number ) {
    return question[GetRandom(x)]
} // PickQuestion()

function PickSomeOnetoDraw( x:number ) {
    let temp = Array.from( id_list.keys() )
    let target = id_list.get(temp[x])
    return target
} // PickSomeOnetoDraw()

function LaunchGame( socket:Socket, someone:string ) {
    artist = someone
    answer = PickQuestion( question.length )
    if ( socket.id != someone )
        socket.to( someone ).emit( 'your_tern', answer )
    else 
        socket.emit( 'your_tern', answer )
} // LaunchGame()

let connect = 0
let id_table = new Map()
let id_list = new Map()
let game_start = false
let question = ['葉子', '蘋果', '鉛筆', '橡皮擦', '汽車', '貨車', '腳踏車', '房子', '地圖', '電腦', '網球拍', '電視' ]
let answer = ''
let artist = ''
let trace = new Array()

io.on('connect', (socket:Socket) => {
    socket.on('eraser', data => {
        socket.broadcast.emit( 'eraser', data )
    })

    socket.on('clear', data => {
        trace = new Array()
        socket.broadcast.emit( 'clear', data )
    })

    socket.on('pen', data => {
        socket.broadcast.emit( 'pen', data )
    })

    socket.on('not_your_tern', () => {
        socket.broadcast.emit('not_your_tern', '' )
    })

    socket.on('some_is_drawing', pos => {
        trace.push( pos )
        socket.broadcast.emit('some_is_drawing', pos )
    })

    socket.on('login', data => {
        id_table.set( socket.id, data )
        id_list.set( data, socket.id )
        let login_msg = `${data} 進入遊戲室!`
        console.log( login_msg );
        connect++
        let count_msg = "上線人數 : " + connect.toString()
        SendMsg( socket, 'online', count_msg )
        SendMsg( socket, 'message', login_msg );
        SendMsg( socket, 'user_list', Array.from( id_list.keys() ) )
        if ( game_start == false ) {
            socket.emit( 'wait_for_connect', '' )
        } // if

        else {
            socket.emit( 'new_user', trace )
        } // else

        if ( connect > 1 && game_start == false ) {
            console.log("遊戲開始!")
            game_start = true
            LaunchGame( socket, PickSomeOnetoDraw(0) )
        } // if
    })

    socket.on('message', data => {
        SendMsg( socket, 'message', data )
        if ( game_start ) {
            if ( data.includes( answer ) ) {
                trace = new Array()
                socket.to( artist ).emit( 'not_your_turn', '' )
                let id = id_table.get( socket.id )
                let cor_msg = `${id}答對了!`
                SendMsg( socket, 'message', cor_msg )
                console.log(cor_msg)
                LaunchGame( socket, socket.id )
            } // if
        } // if
    })

    socket.on('disconnect', () => {
        let id = id_table.get( socket.id )
        id_table.delete( socket.id )
        id_list.delete( id )
        connect--
        let count_msg = "上線人數 : " + connect.toString()
        SendMsg( socket, 'online', count_msg )
        SendMsg( socket, 'user_list', Array.from( id_list.keys() ) )
        let logout_msg = `${id} 離開遊戲室!`
        if ( connect < 2 ) {
            socket.broadcast.emit( 'wait_for_connect', '' )
            game_start = false
        } // if

        else if ( artist == socket.id ) {
            LaunchGame( socket, PickSomeOnetoDraw( GetRandom( connect ) ) )
        } // if

        console.log(logout_msg)

        SendMsg( socket, 'message', logout_msg );
    })
})
