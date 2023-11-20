module.exports = {
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader",
                    },
                    {
                        loader: "angular2-template-loader"
                    }
                ]
            },
            {
                test: /\.(html)$/,
                use: {
                  loader: "html-loader",
                  options: {
                    // angular 2 templates break if these are omitted
                    removeAttributeQuotes: false,
                    keepClosingSlash: true,
                    caseSensitive: true,
                    conservativeCollapse: true,
                  }
                }
            }
        ]
    }
};