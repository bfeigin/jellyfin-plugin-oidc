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
function form(m, idx, providers, targets) {
    return select('emailmap_provider_' + idx, 'Provider', m.ProviderId || '', providers) +
        fld('Expected verified email', 'email', 'emailmap_email_' + idx, m.Email || '', 'user@gmail.com') +
        select('emailmap_user_' + idx, 'Jellyfin user', userKey(m.UserId), targets);
}
function readMapping(view, idx) {
    return {
        ProviderId: gval(view, 'emailmap_provider_' + idx).trim(),
        Email: gval(view, 'emailmap_email_' + idx).trim(),
        UserId: gval(view, 'emailmap_user_' + idx).trim()
    };
}
function updateSummary(row) {
    var idx = row.getAttribute('data-email-mapping');
    var email = row.querySelector('#emailmap_email_' + idx);
    var target = row.querySelector('#emailmap_user_' + idx);
    var provider = row.querySelector('#emailmap_provider_' + idx);
    row.querySelector('.oidc-email-address').textContent = email.value.trim() || 'Email mapping';
    row.querySelector('.oidc-email-target').textContent =
        (target.selectedOptions[0]?.textContent || 'Select a user') + ' · ' +
        (provider.selectedOptions[0]?.textContent || 'Select a provider');
}
export function renderEmailMappings(view) {
    var providers = (cfg.Providers || []).map(function (p) {
        return { value: p.ProviderId, label: p.DisplayName || p.ProviderId };
    });
    var targets = users.filter(function (u) { return !(u.Policy && u.Policy.IsAdministrator); }).map(function (u) {
        return { value: userKey(u.Id), label: u.Name };
    });
    var list = view.querySelector('#emailUserMappingList');
    list.innerHTML = (cfg.EmailUserMappings || []).map(function (m, idx) {
        return el('details', { class: 'oidc-email-mapping', 'data-email-mapping': idx },
            el('summary', { class: 'oidc-email-summary' },
                el('span', { class: 'oidc-email-summary-text' },
                    el('span', { class: 'oidc-email-address' }, '') +
                    el('span', { class: 'oidc-email-target' }, '')) +
                el('span', { class: 'oidc-email-edit' }, 'Edit')) +
            el('div', { class: 'oidc-email-editor' }, form(m, idx, providers, targets) +
                el('div', { class: 'oidc-row-actions' },
                    el('button', { type: 'button', is: 'emby-button', class: 'oidc-btn-secondary', 'data-done-email-mapping': idx }, 'Done') +
                    el('button', { type: 'button', is: 'emby-button', class: 'oidc-btn-remove', 'data-remove-email-mapping': idx }, 'Delete mapping'))));
    }).join('');
    list.querySelectorAll('[data-email-mapping]').forEach(updateSummary);
    view.querySelector('#emailUserMappingDraft').innerHTML = form({ ProviderId: providers.length === 1 ? providers[0].value : '' }, 'new', providers, targets);
    view.querySelectorAll('#emailUserMappingDraft input, #emailUserMappingDraft select').forEach(function (field) { field.required = true; });
}
export function collectEmailMappings(view) {
    return Array.from(view.querySelectorAll('[data-email-mapping]')).map(function (row) {
        return readMapping(view, row.getAttribute('data-email-mapping'));
    });
}
export function setupEmailMappings(view) {
    view.querySelector('#btnAddEmailUserMapping').addEventListener('click', function () {
        if (!cfg) return;
        var fields = Array.from(view.querySelectorAll('#emailUserMappingDraft input, #emailUserMappingDraft select'));
        if (fields.some(function (field) { return !field.reportValidity(); })) return;
        cfg.EmailUserMappings = collectEmailMappings(view);
        cfg.EmailUserMappings.push(readMapping(view, 'new'));
        cfg.Providers = collectProviders(view);
        renderEmailMappings(view);
        setDirty(true);
        view.querySelector('#emailmap_email_new').focus();
    });
    var list = view.querySelector('#emailUserMappingList');
    list.addEventListener('input', function (e) {
        var row = e.target.closest('[data-email-mapping]');
        if (row) updateSummary(row);
    });
    list.addEventListener('change', function (e) {
        var row = e.target.closest('[data-email-mapping]');
        if (row) updateSummary(row);
    });
    list.addEventListener('click', function (e) {
        var remove = e.target.closest('[data-remove-email-mapping]');
        var done = e.target.closest('[data-done-email-mapping]');
        if (remove) {
            remove.closest('[data-email-mapping]').remove();
            setDirty(true);
        } else if (done) {
            var row = done.closest('[data-email-mapping]');
            updateSummary(row);
            row.open = false;
            row.querySelector('summary').focus();
        }
    });
}
