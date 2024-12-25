const not_settings = ['user_id', 'username', 'first_name', 'last_name', 'last_act', 'isTag', "id", "is_bot", "language_code"];

class User {
    /**
     * @param {object} userdata 
     * @param {bigint} userdata.id
     * @param {string=} userdata.username
     * @param {string=} userdata.first_name
     * @param {string=} userdata.last_name 
     */
    constructor(userdata) {
        this.set_userdata(userdata);
    }

    /**
     * @return {string} Имя пользователя
     */
    name() {
        let usr = (this.first_name + ' ' + this.last_name).trim();
        if (usr == '') usr = this.username;
        usr = clearBadS(usr);
        if (usr == '') usr = "Пользователь";
        return usr;
    }

    /**
     * @return {string} ссылка на пользователя по username
     */
    link() {
        if (this.username != '') return get_href(`https://t.me/${this.username}`, this.name());
        return this.name()
    }

    /**
     * @return {string} ссылка на пользователя по user_id - тегает пользователя
     */
    tag() {
        if (!this.isTag) return this.link();
        if (this.user_id != '') return get_href(`tg://user?id=${this.user_id}`, this.name());
        return this.name()
    }

    /**
     * @return {string} ссылка на пользователя по user_id - тегает пользователя 
     */
    tag_Markdown() {
        if (this.user_id != '') return `[${this.name()}](tg://user?id=${this.user_id})`
        return this.name()
    }

    /**
     * @param {object} userdata 
     * @param {bigint} userdata.id
     * @param {string=} userdata.username
     * @param {string=} userdata.first_name
     * @param {string=} userdata.last_name 
     */
    set_userdata(userdata) {
        if (userdata?.id) {
            this.user_id = BigInt(userdata.id).toString();
        } else if (userdata?.user_id) {
            this.user_id = BigInt(userdata.user_id).toString();
        }
        this.id = this.user_id ?? '';
        this.username = userdata?.username ? userdata.username : '';
        this.first_name = userdata?.first_name ? userdata.first_name : '';
        this.last_name = userdata?.last_name ? userdata.last_name : '';
        this.isTag = userdata?.isTag != undefined ? userdata.isTag : 1;
    }

    not_settings(key) {
        return !not_settings.includes(key);
    }
}

function get_href(url, text) {
    return `<a href="${url}">${text || url}</a>`
}

function clearBadS(string) {
    if (!string) return '';
    let result = string.replace(/<|>|̶/g, '');
    return "\u200E" + result;
}

module.exports = User;
