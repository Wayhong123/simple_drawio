"use strict";
exports.__esModule = true;
var path = require("path");
var PORT = 3000;
var PORT2 = 4096;
var express = require("express");
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
app.use(express.urlencoded({ extended: false }));
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'jade');
app.use(express.static(__dirname + '//static'));
app.get("/", function (req, res) {
    res.render("index");
});
server.listen(PORT, function () {
    console.log("Server running at http://127.0.0.1:".concat(PORT));
});
function SendMsg(socket, event, msg) {
    socket.emit(event, msg);
    socket.broadcast.emit(event, msg);
} // SendMsg()
function GetRandom(x) {
    return Math.floor(Math.random() * x);
} // GetRandom()
function PickQuestion(x) {
    return question[GetRandom(x)];
} // PickQuestion()
function PickSomeOnetoDraw(x) {
    var temp = Array.from(id_list.keys());
    var target = id_list.get(temp[x]);
    return target;
} // PickSomeOnetoDraw()
function LaunchGame(socket, someone) {
    artist = someone;
    answer = PickQuestion(question.length);
    if (socket.id != someone)
        socket.to(someone).emit('your_tern', answer);
    else
        socket.emit('your_tern', answer);
} // LaunchGame()
var connect = 0;
var id_table = new Map();
var id_list = new Map();
var game_start = false;
var question = ['葉子', '蘋果', '鉛筆', '橡皮擦', '汽車', '貨車', '腳踏車', '房子', '地圖', '電腦', '網球拍', '電視'];
var answer = '';
var artist = '';
var trace = new Array();
io.on('connect', function (socket) {
    socket.on('eraser', function (data) {
        socket.broadcast.emit('eraser', data);
    });
    socket.on('clear', function (data) {
        trace = new Array();
        socket.broadcast.emit('clear', data);
    });
    socket.on('pen', function (data) {
        socket.broadcast.emit('pen', data);
    });
    socket.on('not_your_tern', function () {
        socket.broadcast.emit('not_your_tern', '');
    });
    socket.on('some_is_drawing', function (pos) {
        trace.push(pos);
        socket.broadcast.emit('some_is_drawing', pos);
    });
    socket.on('login', function (data) {
        id_table.set(socket.id, data);
        id_list.set(data, socket.id);
        var login_msg = "".concat(data, " \u9032\u5165\u904A\u6232\u5BA4!");
        console.log(login_msg);
        connect++;
        var count_msg = "上線人數 : " + connect.toString();
        SendMsg(socket, 'online', count_msg);
        SendMsg(socket, 'message', login_msg);
        SendMsg(socket, 'user_list', Array.from(id_list.keys()));
        if (game_start == false) {
            socket.emit('wait_for_connect', '');
        } // if
        else {
            socket.emit('new_user', trace);
        } // else
        if (connect > 1 && game_start == false) {
            console.log("遊戲開始!");
            game_start = true;
            LaunchGame(socket, PickSomeOnetoDraw(0));
        } // if
    });
    socket.on('message', function (data) {
        SendMsg(socket, 'message', data);
        if (game_start) {
            if (data.includes(answer)) {
                trace = new Array();
                socket.to(artist).emit('not_your_turn', '');
                var id = id_table.get(socket.id);
                var cor_msg = "".concat(id, "\u7B54\u5C0D\u4E86!");
                SendMsg(socket, 'message', cor_msg);
                console.log(cor_msg);
                LaunchGame(socket, socket.id);
            } // if
        } // if
    });
    socket.on('disconnect', function () {
        var id = id_table.get(socket.id);
        id_table["delete"](socket.id);
        id_list["delete"](id);
        if (connect)
            connect--;
        var count_msg = "上線人數 : " + connect.toString();
        SendMsg(socket, 'online', count_msg);
        SendMsg(socket, 'user_list', Array.from(id_list.keys()));
        var logout_msg = "".concat(id, " \u96E2\u958B\u904A\u6232\u5BA4!");
        if (connect < 2) {
            socket.broadcast.emit('wait_for_connect', '');
            game_start = false;
        } // if
        else if (artist == socket.id) {
            LaunchGame(socket, PickSomeOnetoDraw(GetRandom(connect)));
        } // if
        console.log(logout_msg);
        SendMsg(socket, 'message', logout_msg);
    });
});
