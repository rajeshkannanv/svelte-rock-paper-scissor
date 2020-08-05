const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const sveltePath = path.resolve('node_modules', 'svelte')

module.exports = env => {
    const mode = env.mode;
    const prod = mode === 'production'
    return {
        entry: {
            bundle: ['./src/main.js'],
        },
        output: {
            path: __dirname + '/public',
            filename: '[name].js',
            chunkFilename: '[name].[id].js',
        },
        resolve: {
            alias: {
                svelte: sveltePath
            },
            extensions: [".mjs", ".js", ".svelte"],
            mainFields: ["svelte", "browser", "module", "main"]
        },
        mode,
        devtool: "none",
        module: {
            rules: [{
                    test: /\.(js|mjs|svelte)$/,
                    include: [
                        path.resolve(__dirname, "src"),
                        path.resolve(__dirname, "node_modules/svelte")
                    ],
                    use: {
                        loader: "babel-loader",
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    targets: {
                                        "browsers": [
                                            "ie >= 11"
                                        ]
                                    },
                                    useBuiltIns: "usage",
                                    corejs: 3
                                }]
                            ],
                        },
                    }
                },
                {
                    test: /\.svelte$/,
                    exclude: /node_modules/,
                    use: [{
                        loader: "svelte-loader",
                        options: {
                            emitCss: true
                        }
                    }]
                },
                {
                    test: /\.css$/,
                    use: [
                        /**
                         * MiniCssExtractPlugin doesn't support HMR.
                         * For developing, use 'style-loader' instead.
                         * */
                        prod ? MiniCssExtractPlugin.loader : 'style-loader',
                        'css-loader',
                    ],
                },
            ]
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: "[name].css"
            })
        ],
        devtool: prod ? false : 'source-map',
    };
};