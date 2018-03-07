/** @jsx React.DOM */

var classSet = webchooser.component.classSet;
var BootstrapMixin = webchooser.component.BootstrapMixin;


var Tooltip = React.createClass({displayName: 'Tooltip',
  mixins: [BootstrapMixin],

  propTypes: {
    placement: React.PropTypes.oneOf(['top','right', 'bottom', 'left']),
    positionLeft: React.PropTypes.number,
    positionTop: React.PropTypes.number,
    arrowOffsetLeft: React.PropTypes.number,
    arrowOffsetTop: React.PropTypes.number
  },

  getDefaultProps: function () {
    return {
      placement: 'right'
    };
  },

  render: function () {
    var classes = {};
    classes['tooltip'] = true;
    classes[this.props.placement] = true;
    classes['in'] = this.props.positionLeft != null || this.props.positionTop != null;

    var style = {};
    style['left'] = this.props.positionLeft;
    style['top'] = this.props.positionTop;

    var arrowStyle = {};
    arrowStyle['left'] = this.props.arrowOffsetLeft;
    arrowStyle['top'] = this.props.arrowOffsetTop;

    return this.transferPropsTo(
        React.DOM.div({className: classSet(classes), style: style}, 
          React.DOM.div({className: "tooltip-arrow", style: arrowStyle}), 
          React.DOM.div({className: "tooltip-inner"}, 
            this.props.children
          )
        )
      );
  }
});

webchooser.component.Tooltip = Tooltip;