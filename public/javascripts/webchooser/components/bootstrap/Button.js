/** @jsx React.DOM */
var classSet = webchooser.component.classSet;
var BootstrapMixin = webchooser.component.BootstrapMixin;
var CustomPropTypes = webchooser.component.CustomPropTypes;

var Button = React.createClass({displayName: 'Button',
  mixins: [BootstrapMixin],

  propTypes: {
    active:   React.PropTypes.bool,
    disabled: React.PropTypes.bool,
    block:    React.PropTypes.bool,
    navItem:    React.PropTypes.bool,
    navDropdown: React.PropTypes.bool,
    componentClass: CustomPropTypes.componentClass
  },

  getDefaultProps: function () {
    return {
      bsClass: 'button',
      bsStyle: 'default',
      type: 'button'
    };
  },

  render: function () {
    var classes = this.props.navDropdown ? {} : this.getBsClassSet();
    var renderFuncName;

    classes['active'] = this.props.active;
    classes['btn-block'] = this.props.block;

    if (this.props.navItem) {
      return this.renderNavItem(classes);
    }

    renderFuncName = this.props.href || this.props.navDropdown ?
      'renderAnchor' : 'renderButton';

    return this[renderFuncName](classes);
  },

  renderAnchor: function (classes) {
    var component = this.props.componentClass || React.DOM.a;
    var href = this.props.href || '#';
    classes['disabled'] = this.props.disabled;

    return this.transferPropsTo(
      component({
        href: href, 
        className: classSet(classes), 
        role: "button"}, 
        this.props.children
      )
    );
  },

  renderButton: function (classes) {
    var component = this.props.componentClass || React.DOM.button;

    return this.transferPropsTo(
      component({
        className: classSet(classes)}, 
        this.props.children
      )
    );
  },

  renderNavItem: function (classes) {
    var liClasses = {
      active: this.props.active
    };

    return (
      React.DOM.li({className: classSet(liClasses)}, 
        this.renderAnchor(classes)
      )
    );
  }
});

webchooser.component.Button = Button;
