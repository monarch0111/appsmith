import React, { useRef, useEffect, useState } from "react";
import styled from "styled-components";
import { createPortal } from "react-dom";
import PopperJS, { Placement, PopperOptions } from "popper.js";
// import { getProppanePreference } from "selectors/usersSelectors";
import { useDispatch, useSelector } from "react-redux";
import { ReduxActionTypes } from "constants/ReduxActionConstants";
import { getProppanePreference } from "selectors/usersSelectors";

type PopperProps = {
  zIndex: number;
  isOpen: boolean;
  targetNode?: Element;
  children: JSX.Element;
  placement: Placement;
  modifiers?: Partial<PopperOptions["modifiers"]>;
  isPropPane?: boolean;
};

const PopperWrapper = styled.div<{ zIndex: number }>`
  z-index: ${(props) => props.zIndex};
  position: absolute;
`;

const draggableElement = (
  element: any,
  onPositionChange: any,
  initPostion?: any,
) => {
  let newXPos = 0,
    newYPos = 0,
    oldXPos = 0,
    oldYPos = 0;

  const setElementPosition = () => {
    element.style.top = element.offsetTop - initPostion.yPos + "px";
    element.style.left = element.offsetLeft - initPostion.xPos + "px";
  };

  if (initPostion) {
    setTimeout(setElementPosition(), 100);
  }
  const dragMouseDown = (e: MouseEvent) => {
    e = e || window.event;
    e.preventDefault();
    oldXPos = e.clientX;
    oldYPos = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  };
  element.onmousedown = dragMouseDown;

  const elementDrag = (e: MouseEvent) => {
    e = e || window.event;
    e.preventDefault();
    newXPos = oldXPos - e.clientX;
    newYPos = oldYPos - e.clientY;
    oldXPos = e.clientX;
    oldYPos = e.clientY;
    element.style.top = element.offsetTop - newYPos + "px";
    element.style.left = element.offsetLeft - newXPos + "px";
    console.log(element.getBoundingClientRect());
  };

  const closeDragElement = () => {
    onPositionChange({
      xPos: element.getBoundingClientRect().left,
      yPos: element.getBoundingClientRect().top,
    });
    document.onmouseup = null;
    document.onmousemove = null;
  };
};

/* eslint-disable react/display-name */
export default (props: PopperProps) => {
  const contentRef = useRef(null);
  const [position, setPosition] = useState<any>(null);
  const propPanePreference = useSelector(getProppanePreference);
  const dispatch = useDispatch();
  useEffect(() => {
    if (position) {
      dispatch({
        type: ReduxActionTypes.PROP_PANE_MOVED,
        payload: {
          position: {
            xPos: position.xPos,
            yPos: position.yPos,
          },
        },
      });
    }
  }, [position]);

  useEffect(() => {
    const parentElement = props.targetNode && props.targetNode.parentElement;
    if (
      parentElement &&
      parentElement.parentElement &&
      props.targetNode &&
      props.isOpen
    ) {
      // TODO: To further optimize this, we can go through the popper API
      // and figure out a way to keep an app instance level popper instance
      // which we can update to have different references when called here.
      // However, the performance benefit gained by such an optimization
      // remaines to be discovered.
      const _popper = new PopperJS(
        props.targetNode,
        (contentRef.current as unknown) as Element,
        {
          ...(props.isPropPane && propPanePreference?.isMoved
            ? {}
            : { placement: props.placement }),
          onCreate: (popperData) => {
            const elementRef: any = popperData.instance.popper;
            if (props.isPropPane && propPanePreference?.isMoved) {
              elementRef.style.transform = "unset";
              elementRef.style.top = propPanePreference?.position.yPos + "px";
              elementRef.style.left = propPanePreference?.position.xPos + "px";
            }
          },
          modifiers: {
            flip: {
              behavior: ["right", "left", "bottom", "top"],
            },
            keepTogether: {
              enabled: false,
            },
            arrow: {
              enabled: false,
            },
            preventOverflow: {
              enabled: true,
              boundariesElement: "viewport",
            },
            ...props.modifiers,
          },
        },
      );
      if (props.isPropPane) {
        propPanePreference?.isMoved && _popper.disableEventListeners();
        draggableElement(
          _popper.popper,
          (newPosition: any) => setPosition(newPosition),
          propPanePreference?.isMoved ? propPanePreference.position : null,
        );
      }

      return () => {
        _popper.destroy();
      };
    }
  }, [
    props.targetNode,
    props.isOpen,
    props.modifiers,
    props.placement,
    propPanePreference?.isMoved,
  ]);
  return createPortal(
    <PopperWrapper ref={contentRef} zIndex={props.zIndex}>
      {props.children}
    </PopperWrapper>,
    document.body,
  );
};
