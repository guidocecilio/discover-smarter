/** @jsx React.DOM */

var React = require('react');
var classSet = webchooser.component.classSet;
var BootstrapMixin = rwebchooser.component.BootstrapMixin;
var Button = webchooser.component.Button;

var ButtonGroup = React.createClass({
  mixins: [BootstrapMixin],

  propTypes: {
    vertical:  React.PropTypes.bool,
    justified: React.PropTypes.bool
  },

  getDefaultProps: function () {
    return {
      bsClass: 'button-group'
    };
  },

  render: function () {
    var classes = this.getBsClassSet();
    classes['btn-group'] = !this.props.vertical;
    classes['btn-group-vertical'] = this.props.vertical;
    classes['btn-group-justified'] = this.props.justified;

    return this.transferPropsTo(
      <div
        className={classSet(classes)}>
        {this.props.children}
      </div>
    );
  }
});

webchooser.component.ButtonGroup = ButtonGroup;