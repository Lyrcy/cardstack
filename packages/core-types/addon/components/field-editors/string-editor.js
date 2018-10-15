import Component from '@ember/component';
import { not } from '@ember/object/computed';
import { task } from 'ember-concurrency';
import layout from '../../templates/components/field-editors/string-editor';

export default Component.extend({
  layout,

  disabled: not('enabled'),

  validate: task(function * () {
    yield this.content.validate();
  })
});
