import axios from "axios";

const BASE_URL = 'scattered-ermentrude-promconsulting-23cbccde.koyeb.app/';

const $api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

export default $api;
