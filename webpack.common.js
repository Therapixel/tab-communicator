const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const distFolderPath = './dist';

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, distFolderPath),
        filename: 'index.js',
        library: 'TabCommunicator',
        libraryTarget: 'umd',
    },
    externals: [{
        'event-emitter': {
            commonjs: 'event-emitter',
            commonjs2: 'event-emitter',
            amd: 'event-emitter',
            root: '_',
        },
    }],
    plugins: [
        new CleanWebpackPlugin([ distFolderPath ]),
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
            },
        ],
    },
};
