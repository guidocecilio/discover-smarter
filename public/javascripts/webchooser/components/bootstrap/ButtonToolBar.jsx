/** @jsx React.DOM */

var classSet = webchooser.component.classSet;
var BootstrapMixin = webchooser.component.BootstrapMixin;
var Button = webchooser.component.Button;

var ButtonToolbar = React.createClass({
  mixins: [BootstrapMixin],

  getDefaultProps: function () {
    return {
      bsClass: 'button-toolbar'
    };
  },

  render: function () {
    var classes = this.getBsClassSet();

    return this.transferPropsTo(
      <div
        role="toolbar"
        className={classSet(classes)}>
        {this.props.children}
      </div>
    );
  }
});

webchooser.component.ButtonToolbar = ButtonToolbar;