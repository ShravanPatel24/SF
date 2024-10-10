const { version } = require("../../package.json");
const config = require("../config/config");

const swaggerDef = {
    openapi: "3.0.0",
    info: {
        title: "Ocean",
        version,
        // license: {
        //     name: 'MIT',
        //     url: '',
        // },
    },
    servers: [
        {
            url: `http://localhost:${config.port}/v1`,
        },
        {
            url: "https://social-api.apikart.co/v1",
        },
        {
            url: "https://prod-api.apikart.co/v1",
        },
        // Add more server URLs as needed
    ],
};

module.exports = swaggerDef;

