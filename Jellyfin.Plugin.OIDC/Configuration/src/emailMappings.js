import { el, esc, gval } from './dom.js';
import { cfg, setDirty } from './state.js';
import { collectProviders } from './providers.js';
import { fld } from './fields.js';

var users = [];
export function setMappingUsers(value) { users = value; }
function userKey(value) { return String(value || '').replace(/-/g, '').toLowerCase(); }
function select(id, label, value, options) {
    var found = options.some(function (o) { return o.value === value; });
    var choices = [{ value: '', label: 'Select ' + label.toLowerCase() }].concat(options);
    if (value && !found) choices.push({ value: value, label: 'Unavailable: ' + value });
    return el('div', { class: 'selectContainer' },
        el('label', { for: id }, esc(label)) +
        el('select', { id: id, is: 'emby-select' }, choices.map(function (o) {
            return el('option', { value: o.value, selected: o.value === value }, esc(o.label));
        }).join('')));
}
export function renderEmailMappings(view) {
    var list = view.querySelector('#emailUserMappingList');
    var providers = (cfg.Providers || []).map(function (p) {
        return { value: p.ProviderId, label: p.DisplayName || p.ProviderId };
    });
    var targets = users.filter(function (u) { return !(u.Policy && u.Policy.IsAdministrator); }).map(function (u) {
        return { value: userKey(u.Id), label: u.Name };
    });
    list.innerHTML = (cfg.EmailUserMappings || []).map(function (m, idx) {
        return el('div', { class: 'oidc-item-card', 'data-email-mapping': idx },
            select('emailmap_provider_' + idx, 'Provider', m.ProviderId || '', providers) +
            fld('Expected verified email', 'email', 'emailmap_email_' + idx, m.Email || '', 'user@gmail.com') +
            select('emailmap_user_' + idx, 'Jellyfin user', userKey(m.UserId), targets) +
            el('button', { type: 'button', is: 'emby-button', 'data-remove-email-mapping': idx }, 'Remove mapping'));
    }).join('');
}
export function collectEmailMappings(view) {
    return Array.from(view.querySelectorAll('[data-email-mapping]')).map(function (row) {
        var idx = row.getAttribute('data-email-mapping');
        return {
            ProviderId: gval(view, 'emailmap_provider_' + idx).trim(),
            Email: gval(view, 'emailmap_email_' + idx).trim(),
            UserId: gval(view, 'emailmap_user_' + idx).trim()
        };
    });
}
export function setupEmailMappings(view) {
    view.querySelector('#btnAddEmailUserMapping').addEventListener('click', function () {
        if (!cfg) return;
        cfg.EmailUserMappings = collectEmailMappings(view);
        cfg.Providers = collectProviders(view);
        cfg.EmailUserMappings.push({ ProviderId: cfg.Providers.length === 1 ? cfg.Providers[0].ProviderId : '', Email: '', UserId: '' });
        renderEmailMappings(view);
        setDirty(true);
    });
    view.querySelector('#emailUserMappingList').addEventListener('click', function (e) {
        var button = e.target.closest('[data-remove-email-mapping]');
        if (!button) return;
        button.closest('[data-email-mapping]').remove();
        setDirty(true);
    });
}
