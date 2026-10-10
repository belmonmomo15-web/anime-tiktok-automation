const crypto = require('crypto');
const axios = require('axios');

const pendingStates = new Map();

function setupTikTokOAuth(app) {
    const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
    const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
    const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

    const SCOPES =
        process.env.TIKTOK_SCOPES ||
        'user.info.basic,video.publish,video.upload';

    app.get('/auth/tiktok', (req, res) => {
        if (!CLIENT_KEY || !CLIENT_SECRET || !REDIRECT_URI) {
            return res.status(500).send(
                'Configuration TikTok incomplete sur Railway.'
            );
        }

        const state = crypto.randomBytes(32).toString('hex');

        pendingStates.set(state, Date.now());

        // Nettoyage des anciennes demandes après 10 minutes
        for (const [key, time] of pendingStates.entries()) {
            if (Date.now() - time > 10 * 60 * 1000) {
                pendingStates.delete(key);
            }
        }

        const params = new URLSearchParams({
            client_key: CLIENT_KEY,
            response_type: 'code',
            scope: SCOPES,
            redirect_uri: REDIRECT_URI,
            state
        });

        res.redirect(
            'https://www.tiktok.com/v2/auth/authorize/?' +
            params.toString()
        );
    });

    app.get('/auth/tiktok/callback', async (req, res) => {
        const { code, state, error, error_description } = req.query;

        if (error) {
            return res.status(400).send(
                'Autorisation refusée : ' +
                String(error_description || error)
            );
        }

        if (
            !state ||
            !pendingStates.has(state) ||
            Date.now() - pendingStates.get(state) > 10 * 60 * 1000
        ) {
            return res.status(400).send(
                'Échec de sécurité : état OAuth invalide ou expiré.'
            );
        }

        pendingStates.delete(state);

        if (!code) {
            return res.status(400).send(
                'Code d’autorisation TikTok manquant.'
            );
        }

        try {
            const response = await axios.post(
                'https://open.tiktokapis.com/v2/oauth/token/',
                new URLSearchParams({
                    client_key: CLIENT_KEY,
                    client_secret: CLIENT_SECRET,
                    code: String(code),
                    grant_type: 'authorization_code',
                    redirect_uri: REDIRECT_URI
                }).toString(),
                {
                    headers: {
                        'Content-Type':
                            'application/x-www-form-urlencoded'
                    },
                    timeout: 15000
                }
            );

            const data = response.data;

            if (!data.access_token || !data.refresh_token) {
                console.error(
                    'TikTok OAuth : réponse sans les jetons attendus.'
                );

                return res.status(502).send(
                    'TikTok n’a pas retourné les jetons attendus.'
                );
            }

            // Ne jamais afficher les jetons dans le navigateur.
            // Ils devront être stockés de manière sécurisée.
            app.locals.tiktokOAuth = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                openId: data.open_id,
                expiresAt: Date.now() + data.expires_in * 1000,
                refreshExpiresAt:
                    Date.now() + data.refresh_expires_in * 1000,
                scopes: data.scope
            };

            console.log('Connexion TikTok autorisée.');

            return res.send(`
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport"
                          content="width=device-width, initial-scale=1">
                    <title>Connexion TikTok</title>
                </head>
                <body style="font-family:Arial;text-align:center;padding:40px">
                    <h2>Connexion TikTok réussie !</h2>
                    <p>L’autorisation a été reçue par le serveur.</p>
                    <p>Tu peux maintenant revenir à ton projet.</p>
                </body>
                </html>
            `);
        } catch (err) {
            // Ne pas journaliser la réponse complète : elle peut
            // contenir des informations sensibles.
            console.error(
                'Échec de la connexion TikTok :',
                err.response?.status || err.message
            );

            return res.status(502).send(
                'Impossible de terminer la connexion TikTok. ' +
                'Vérifie la configuration et les journaux Railway.'
            );
        }
    });
}

module.exports = setupTikTokOAuth;
