import { ApplicationFunctionOptions, Probot } from "probot";
import { RepoProfile } from "./types";
import createSecrets from "./create-secrets";
import * as querystring from "querystring";

import axios from 'axios'

// Git Data API use case example
// See: https://developer.github.com/v3/git/ to learn more

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
const originalRepoProfile: RepoProfile = {
    owner: 'Likenttt',
    repo: 'DailySync'
};
const opts = { headers: { accept: 'application/json' }, callbackURL:'/login/oauth-callback'};

export = (app: Probot, {getRouter}: ApplicationFunctionOptions) => {
    // Get an express router to expose new HTTP endpoints
    const router = getRouter("/api");

    // Use any middleware
    router.use(require("express").static("public"));

    // Add a new route
    router.get("/hello-world", (req: any, res: any) => {
        console.log(req);
        res.send("Hello World");
    });

    router.get('/auth', async (req, res) => {
        const octokit = await app.auth()
        const { data } = await octokit.apps.getAuthenticated()
        res.json(data)
    });

    router.get('/login', async (req, res) => {
        // GitHub needs us to tell it where to redirect users after they've authenticated
        const protocol = req.headers['x-forwarded-proto'] || req.protocol
        const host = req.headers['x-forwarded-host'] || req.get('host')

        const params = querystring.stringify({
            client_id: process.env.CLIENT_ID,
            redirect_uri: `${protocol}://${host}${opts.callbackURL}`
        })

        const url = `https://github.com/login/oauth/authorize?${params}`
        res.redirect(url)
    })

    router.get('/login/oauth-callback', async (req, res) => {
        // Exchange our "code" and credentials for a real token
        let token:any = null;
            const body = {
                client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET, code: req.query.code
            };
            axios.post(`https://github.com/login/oauth/access_token`, body, opts).
            then(res => res.data['access_token']).
            then(_token => {
                console.log('My token:', token);
                token = _token;
                res.json({ ok: 1 });
            }).
            catch(err => res.status(500).json({ message: err.message }));
        // Authenticate our Octokit client with the new token

        const octokit = require('@octokit/rest')();

        octokit.authenticate({ type: 'token', token })

        // Get the currently authenticated user
        const user = await octokit.users.getAuthenticated()
        console.log(user.data.login) // <-- This is what we want!

        // Redirect after login
        res.redirect('/')
    })

    // Opens a PR every time someone installs your app for the first time
    app.on("installation.created", async (context) => {
        // shows all repos you've installed the app on
        // context.log.info(context.payload.repositories);

        const owner = context.payload.installation.account.login;

        //https://octokit.github.io/rest.js/v18#repos
        //Create a fork
        await context.octokit.repos.createFork(originalRepoProfile);

        const forkRepoProfile: RepoProfile = {
            owner: owner,
            repo: 'DailySync'
        };

        //Generate a public key which we need to add or update secrets
        //https://docs.github.com/en/rest/codespaces/repository-secrets#get-a-repository-public-key
        const publicKeyResponse = await context.octokit.rest.dependabot.getRepoPublicKey(forkRepoProfile);
        console.log(publicKeyResponse);

        //context, repoProfile, publicKey, secretPairs
        // createSecrets(context, forkRepoProfile, publicKeyResponse, secretPairs);

        // for (const repository of context.payload.repositories) {
        //     const repo = repository.name;
        //
        //     // Generates a random number to ensure the git reference isn't already taken
        //     // NOTE: this is not recommended and just shows an example, so it can work :)
        //
        //     // test
        //     const branch = `new-branch-${Math.floor(Math.random() * 9999)}`;
        //
        //     // Get current reference in Git
        //     const reference = await context.octokit.git.getRef({
        //         repo, // the repo
        //         owner, // the owner of the repo
        //         ref: "heads/master",
        //     });
        //     // Create a branch
        //     await context.octokit.git.createRef({
        //         repo,
        //         owner,
        //         ref: `refs/heads/${branch}`,
        //         sha: reference.data.object.sha, // accesses the sha from the heads/master reference we got
        //     });
        //     // create a new file
        //     await context.octokit.repos.createOrUpdateFileContents({
        //         repo,
        //         owner,
        //         path: "path/to/your/file.md", // the path to your config file
        //         message: "adds config file", // a commit message
        //         content: Buffer.from("My new file is awesome!").toString("base64"),
        //         // the content of your file, must be base64 encoded
        //         branch, // the branch name we used when creating a Git reference
        //     });
        //     // create a PR from that branch with the commit of our added file
        //     await context.octokit.pulls.create({
        //         repo,
        //         owner,
        //         title: "Adding my file!", // the title of the PR
        //         head: branch, // the branch our chances are on
        //         base: "master", // the branch to which you want to merge your changes
        //         body: "Adds my new file!", // the body of your PR,
        //         maintainer_can_modify: true, // allows maintainers to edit your app's PR
        //     });
        // }
    });
    // For more information on building apps:
    // https://probot.github.io/docs/

    // To get your app running against GitHub, see:
    // https://probot.github.io/docs/development/
};


