import slug from 'slug';

/**
 * Sets defaults for slug replacements
 */
const slugLib = slug as any;

slugLib.charmap['.'] = '-';

slugLib.defaults.modes.custom = {
    replacement: '-',
    symbols: true,
    remove: /[%]/g, // remove `%` from slugs to avoid issues with permission removal using `iLike`
    lower: true,
    charmap: slugLib.charmap,
    multicharmap: slugLib.multicharmap
};

slugLib.defaults.mode = 'custom';

export default slug;
