'use strict';

var MemoryDataStore = require('@slack/client').MemoryDataStore;

var BotData =  {

    slackStore: new MemoryDataStore(),
    channel: '',
    send: '',
    helpList: "Lista dostępnych opcji:\n \
            \ !menu - wyswietla cale menu\n \
            \ !coto <numer> - podpowiada jakim daniem jest numer\n \
            \ !jesc <numer> - zamawia danie o numerze\n \
            \ !jesc <kto> <numer> - zamawia danie o numerze za dana osobe\n \
            \ !pozamawiane - lista zamowien\n \
            \ !ruletka - obiadowa ruletka, po wpisaniu komendy nie ma odwrotu.\n \
            \ !zamow - wysyla zamowienia"
}

module.exports = BotData;
