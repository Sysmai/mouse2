// This event executes when a new member joins a server
// The default welcomeMessage is in the config.json file

module.exports = async (client, member) => {

    if (member.user.bot) return; // Prevents botception!

    const settings = await client.doSQL("SELECT points, welcome, welcomeMessage FROM settings WHERE guildId = ?", [member.guild.id]);

    // If the guild has points system on, then when a new member joins the guild
    // we'll set their points to zero and give them the first role reward
    if (settings[0].points === 1) {
        const guildUser = member.guild.id + member.id;
        const points = 0;
        const roleName = client.config.roleRewards.find(l => l.level === points).name;
        client.pointsTable.set(guildUser, points);
        client.assignRole(member, roleName);
    }

    // If welcome is off, don't welcome the user
    // Welcome is on by default
    if (settings[0].welcome === 1) {
        // Replace the placeholders in the welcome message with actual data
        const welcomeMessage = settings[0].welcomeMessage.replace(/{{user}}/g, member.user).replace(/{{server}}/g, member.guild.name).replace(/{{prefix}}/g, settings.prefix);

        // Send the welcome message to the welcomeChannel set in the guild configs
        try {
            let guildChannel;
            if (member.guild.channels.exists("name", settings[0].welcomeChannel))
                guildChannel = await member.guild.channels.find(r => r.name === settings[0].welcomeChannel);
            else return;

            if (!member.guildChannel.permissionsFor(client.user).has("SEND_MESSAGES")) return;

            await guildChannel.send(welcomeMessage);
        } catch (error) {
            client.logger.error(client, `Welcome Message send failure\n${error.stack}`);
        }
    }

};
